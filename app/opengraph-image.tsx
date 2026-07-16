import { ImageResponse } from "next/og";

export const alt = "DustyPages — swap books with coins";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BOOKSHELF_PATH =
  "M169 57v430h78V57h-78zM25 105v190h46V105H25zm158 23h18v320h-18V128zm128.725 7.69l-45.276 8.124l61.825 344.497l45.276-8.124l-61.825-344.497zM89 153v270h62V153H89zm281.502 28.68l-27.594 11.773l5.494 12.877l27.594-11.773l-5.494-12.877zm12.56 29.433l-27.597 11.772l5.494 12.877l27.593-11.772l-5.492-12.877zm12.555 29.434l-27.594 11.77l99.674 233.628l27.594-11.773l-99.673-233.625zM25 313v30h46v-30H25zm190 7h18v128h-18V320zM25 361v126h46V361H25zm64 80v46h62v-46H89z";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "linear-gradient(135deg, #fafafc 0%, #e9e7f8 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 512 512">
          <path fill="#4c46c0" d={BOOKSHELF_PATH} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 84, fontWeight: 700, color: "#22222b" }}>
            DustyPages
          </div>
          <div style={{ fontSize: 34, color: "#4c46c0", maxWidth: 620 }}>
            Swap your finished books for your next great read
          </div>
          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 26,
              color: "#6b6a80",
            }}
          >
            No money — just books & coins
          </div>
        </div>
      </div>
    ),
    size,
  );
}
