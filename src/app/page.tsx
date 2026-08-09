import { SunsetometerExperience } from "@/components/sunsetometer-experience";
import { Workflow } from "@/components/workflow/workflow";

export default function Home() {
  return (
    <main>
      <SunsetometerExperience />

      <Workflow />

      <footer>
        <p>
          The photograph will remain on your device unless a future step
          clearly asks permission to send specific data.
        </p>
        <p>Sunsetometer / Working prototype</p>
      </footer>
    </main>
  );
}
