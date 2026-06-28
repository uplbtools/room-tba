type EventImage = {
  src: string;
  alt: string;
};

const EVENT_IMAGES: Record<string, EventImage> = {
  "institute-of-computer-science-testimonials-2026": {
    src: "/event-images/ics-testimonials-2026.png",
    alt: "Poster for the 2026 Institute of Computer Science Testimonials",
  },
};

export function getEventImage(
  slug: string,
  imageUrl?: string | null,
  title?: string,
): EventImage | null {
  if (imageUrl) {
    return {
      src: imageUrl,
      alt: title ? `Image for ${title}` : "Event image",
    };
  }
  return EVENT_IMAGES[slug] ?? null;
}
