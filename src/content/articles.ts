export type Article = {
  id: string;
  title: string;
  paragraphs: string[];
  /** The text sent to the speech API. Built from title + paragraphs. */
  text: string;
};

const demoParagraphs = [
  "Most pages do not need a redesign. They need to say one thing clearly. Here are three small changes that help almost any page.",
  "First, put the main promise at the top. A visitor should understand what the page offers within five seconds. Use plain words and avoid slogans.",
  "Second, give people one clear next step. If a page has five buttons, many visitors will click none. Choose the action that matters most and make it stand out.",
  "Third, remove anything that slows people down. Long forms, heavy images and unclear labels all cost attention. Cut what you can, then check the page on a phone.",
  "Small changes are easy to try and easy to measure. Change one thing at a time, and you will learn what really helps.",
];

const demoTitle = "Three small changes that make a page easier to use";

const articles: Record<string, Article> = {
  "clearer-pages": {
    id: "clearer-pages",
    title: demoTitle,
    paragraphs: demoParagraphs,
    text: [demoTitle, ...demoParagraphs].join("\n\n"),
  },
};

/**
 * The server only reads out articles that exist here. The browser sends an id,
 * never free text, so nobody can use the public endpoint to voice arbitrary
 * content with the owner's API credits.
 */
export function getArticle(id: string): Article | undefined {
  return Object.hasOwn(articles, id) ? articles[id] : undefined;
}
