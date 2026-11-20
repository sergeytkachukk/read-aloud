import EventLog from "@/components/EventLog";
import ExperimentStats from "@/components/ExperimentStats";
import ListenButton from "@/components/ListenButton";
import { getArticle } from "@/content/articles";
import styles from "./page.module.css";

export default function Home() {
  const article = getArticle("clearer-pages");
  if (!article) {
    throw new Error("Demo article is missing.");
  }

  // About 150 words per minute is a normal speaking speed.
  const words = article.paragraphs.join(" ").split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 150));

  return (
    <main className={styles.main}>
      <p className={styles.kicker}>Read aloud demo</p>
      <h1 className={styles.title}>{article.title}</h1>
      <ListenButton articleId={article.id} minutes={minutes} />
      <article className={styles.article}>
        {article.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
      <EventLog />
      <ExperimentStats />
    </main>
  );
}
