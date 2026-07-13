export type BookMeta = {
  isbn: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  coverUrl: string | null;
  categoryGuess: string | null; // slug from our categories
  language: string | null;
  mrpInr: number | null;
};

const CATEGORY_HINTS: [RegExp, string][] = [
  [/juvenile|children/i, "children"],
  [/comic|manga|graphic/i, "comics-manga"],
  [/self-help|personal growth/i, "self-help"],
  [/textbook|education|study aid|mathematics|physics|chemistry|engineering|medical/i, "academic"],
  [/examination|entrance/i, "competitive-exams"],
  [/biography|history|business|science|philosophy|religion|politics|travel|cooking|true crime/i, "non-fiction"],
  [/fiction|novel|fantasy|thriller|mystery|romance/i, "fiction"],
];

function guessCategory(subjects: string[]): string | null {
  const joined = subjects.join(" ");
  for (const [pattern, slug] of CATEGORY_HINTS) {
    if (pattern.test(joined)) return slug;
  }
  return null;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  ur: "Urdu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
};

async function fromGoogleBooks(isbn: string): Promise<BookMeta | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const info = data.items?.[0]?.volumeInfo;
  if (!info) return null;
  const price = data.items?.[0]?.saleInfo?.listPrice;
  return {
    isbn,
    title: info.title ?? "",
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    publishedYear: info.publishedDate
      ? Number(String(info.publishedDate).slice(0, 4)) || null
      : null,
    coverUrl:
      info.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
    categoryGuess: guessCategory(info.categories ?? []),
    language: LANGUAGE_NAMES[info.language] ?? null,
    mrpInr: price?.currencyCode === "INR" ? Math.round(price.amount) : null,
  };
}

async function fromOpenLibrary(isbn: string): Promise<BookMeta | null> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const book = data[`ISBN:${isbn}`];
  if (!book) return null;
  return {
    isbn,
    title: book.title ?? "",
    authors: (book.authors ?? []).map((a: { name: string }) => a.name),
    publisher: book.publishers?.[0]?.name ?? null,
    publishedYear: book.publish_date
      ? Number(String(book.publish_date).match(/\d{4}/)?.[0]) || null
      : null,
    coverUrl: book.cover?.medium ?? book.cover?.large ?? null,
    categoryGuess: guessCategory(
      (book.subjects ?? []).map((s: { name: string }) => s.name),
    ),
    language: null,
    mrpInr: null,
  };
}

/** ISBN metadata lookup: Google Books first, Open Library as fallback. */
export async function lookupIsbn(rawIsbn: string): Promise<BookMeta | null> {
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, "");
  if (isbn.length !== 10 && isbn.length !== 13) return null;
  try {
    const google = await fromGoogleBooks(isbn);
    if (google?.title) return google;
  } catch (err) {
    console.error("[books] Google Books lookup failed:", err);
  }
  try {
    const openLib = await fromOpenLibrary(isbn);
    if (openLib?.title) return openLib;
  } catch (err) {
    console.error("[books] Open Library lookup failed:", err);
  }
  return null;
}
