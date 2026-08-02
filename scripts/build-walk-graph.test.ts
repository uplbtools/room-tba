import { describe, expect, test } from "bun:test";
import { convertGraphml } from "./build-walk-graph";

// Minimal osmnx-shaped GraphML: A<->B two-way pair with geometry on one
// direction, B->C one-way with a python-list highway class.
const SAMPLE = `<?xml version='1.0' encoding='utf-8'?>
<graphml><key id="d16" for="edge" attr.name="geometry" attr.type="string"/>
<key id="d15" for="edge" attr.name="length" attr.type="string"/>
<key id="d12" for="edge" attr.name="maxspeed" attr.type="string"/>
<key id="d11" for="edge" attr.name="highway" attr.type="string"/>
<key id="d5" for="node" attr.name="x" attr.type="string"/>
<key id="d4" for="node" attr.name="y" attr.type="string"/>
<graph edgedefault="directed">
<node id="100"><data key="d4">14.1600</data><data key="d5">121.2400</data></node>
<node id="200"><data key="d4">14.1610</data><data key="d5">121.2400</data></node>
<node id="300"><data key="d4">14.1610</data><data key="d5">121.2410</data></node>
<edge source="100" target="200" id="0">
  <data key="d11">tertiary</data>
  <data key="d12">40</data>
  <data key="d15">120.5</data>
</edge>
<edge source="200" target="100" id="0">
  <data key="d11">tertiary</data>
  <data key="d12">40</data>
  <data key="d15">120.5</data>
  <data key="d16">LINESTRING (121.2400 14.1610, 121.24005 14.16005, 121.2400 14.1600)</data>
</edge>
<edge source="200" target="300" id="0">
  <data key="d11">['steps', 'footway']</data>
  <data key="d15">110.25</data>
</edge>
</graph></graphml>`;

describe("convertGraphml", () => {
  const graph = convertGraphml(SAMPLE, "sample.gml");

  test("records counts and provenance in meta", () => {
    expect(graph.meta.source).toBe("sample.gml");
    expect(graph.meta.nodeCount).toBe(3);
    expect(graph.meta.sourceDirectedEdges).toBe(3);
    expect(graph.meta.edgeCount).toBe(2);
    expect(graph.meta.onewayCount).toBe(1);
  });

  test("nodes keep osm id and full-precision coordinates", () => {
    expect(graph.nodes).toEqual([
      [100, 14.16, 121.24],
      [200, 14.161, 121.24],
      [300, 14.161, 121.241],
    ]);
  });

  test("reverse duplicates collapse to one record, keeping the geometry side", () => {
    const twoWay = graph.edges.find((e) => e.length === 6);
    // The 200->100 direction had the LINESTRING, so it is the kept record.
    expect(twoWay).toEqual([1, 0, 120.5, "tertiary", 40, [50, -950]]);
  });

  test("unpaired edges keep a one-way flag and normalized list classes", () => {
    const oneWay = graph.edges.find((e) => e.length === 7);
    expect(oneWay).toEqual([1, 2, 110.25, "steps;footway", null, [], 1]);
  });
});
