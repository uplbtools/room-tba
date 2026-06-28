// src/seed-classes.ts

import Database from "bun:sqlite";
// import { sql, SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { classesTable, roomsTable } from "@drizzle/schema";
import amisClasses from "../data/AMIS subjects.json";
import { getTableColumns, eq } from "drizzle-orm";
const client = new Database("data/info.db");
const db = drizzle({ client });

// console.log(scrapedData[0]);
// console.log(scrapedData.filter((data) => data.course_code === "CMSC 200"));

(async function () {
  const scrapedData = await Promise.all(
    (amisClasses.classes as any[]).map(async (classInfo: any) => ({
      type: classInfo.type,
      section: classInfo.section,
      room_id:
        (
          await db
            .select({ id: roomsTable.id })
            .from(roomsTable)
            .where(eq(classInfo.facility_id, roomsTable.room_code))
        )[0]?.id ?? 506,
      course_code: classInfo.course_code,
      course_title: `${classInfo.course.title}${classInfo.course_code.includes("HK 12") ? ` (${classInfo.activity})` : ""}`,
      schedule:
        classInfo.class_dates
          .map(
            (schedData: any) =>
              `${schedData.date} ${schedData.start_time.replace(" ", "")}-${schedData.end_time.replace(" ", "")}`,
          )
          .join(",") ?? "",
      term_id: classInfo.term_id,
    })),
  );

  await db.insert(classesTable).values(scrapedData as any);

  // console.log(
  //   scrapedData.filter((data) => data.course_code.includes("HK 12")),
  // );
})();
