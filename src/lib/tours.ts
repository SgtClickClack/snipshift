import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Starts the business dashboard product tour using driver.js
 * Guides users through key features of the dashboard
 */
export function startBusinessTour() {
  const driverObj = driver({
    showProgress: true,
    onHighlightStarted: (element) => {
      // If we're about to highlight the calendar view, ensure the calendar tab is active first
      if (element && element.id === "calendar-view") {
        const calendarTab = document.querySelector('[data-testid="tab-calendar"]') as HTMLElement;
        if (calendarTab && !calendarTab.classList.contains("border-primary")) {
          calendarTab.click();
          // Wait for the view to render
          return new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    },
    steps: [
      {
        element: "body",
        popover: {
          title: "Welcome to HospoGo",
          description: "Let's show you around your new command center.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#post-job-btn",
        popover: {
          title: "Post a Job",
          description: "Click here to create a new shift or job listing instantly.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#calendar-view",
        popover: {
          title: "The Calendar",
          description: "This is your Roster. Drag and drop to move shifts, or click a day to add details.",
          side: "top",
          align: "start",
        },
      },
      {
        element: "#profile-tab-trigger",
        popover: {
          title: "Profile",
          description: "Keep your business brand fresh by updating your banner and logo here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#messages-btn",
        popover: {
          title: "Messages",
          description: "Chat directly with professionals you have hired.",
          side: "bottom",
          align: "start",
        },
      },
    ],
  });

  driverObj.drive();
}

// INVESTOR BRIEFING FIX: startTrainerTour and startBrandTour now delegate to startBusinessTour
// System now only knows about 'Venue Owner' (Engine) and 'Professional' (Staff)
export function startTrainerTour() {
  startBusinessTour();
}
export function startBrandTour() {
  startBusinessTour();
}

