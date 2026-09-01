import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export async function GET() {
  try {
    const response = await notion.search({
      filter: {
        property: "object",
        value: "data_source",
      },
    });

    const results = response.results.map((item) => ({
      id: item.id,
      object: item.object,
      name:
        "title" in item
          ? item.title
              .map((part) => ("plain_text" in part ? part.plain_text : ""))
              .join("")
          : "Unknown",
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("NOTION TEST ERROR:", error);

    return NextResponse.json(
      { error: "Could not connect to Notion" },
      { status: 500 }
    );
  }
}