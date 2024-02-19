import { HomePage } from "./components/Authentication/home";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <HomePage />
    </main>
  );
}
