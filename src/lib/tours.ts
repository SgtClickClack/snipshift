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

/**
 * Starts the trainer dashboard product tour using driver.js
 * Guides trainers through key features of their dashboard
 */
export function startTrainerTour() {
  const driverObj = driver({
    showProgress: true,
    onHighlightStarted: (element) => {
      // If we're about to highlight the trainer stats, ensure the overview tab is active first
      if (element && element.id === "trainer-stats") {
        const overviewTab = document.querySelector('[data-testid="tab-overview"]') as HTMLElement;
        if (overviewTab && !overviewTab.classList.contains("border-primary")) {
          overviewTab.click();
          // Wait for the view to render
          return new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    },
    steps: [
      {
        element: "body",
        popover: {
          title: "Trainer Hub",
          description: "Manage your courses and educational content here.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#upload-content-btn",
        popover: {
          title: "Upload Button",
          description: "Upload new videos or articles for the community.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#trainer-profile-tab",
        popover: {
          title: "Profile",
          description: "Update your credentials and bio to attract more students.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#trainer-stats",
        popover: {
          title: "Stats",
          description: "Track your content views and engagement.",
          side: "top",
          align: "start",
        },
      },
    ],
  });

  driverObj.drive();
}

/**
 * Starts the brand dashboard product tour using driver.js
 * Guides brands through key features of their dashboard
 */
export function startBrandTour() {
  const driverObj = driver({
    showProgress: true,
    onHighlightStarted: (element) => {
      // If we're about to highlight the brand stats, ensure the overview tab is active first
      if (element && element.id === "brand-stats") {
        const overviewTab = document.querySelector('[data-testid="tab-overview"]') as HTMLElement;
        if (overviewTab && !overviewTab.classList.contains("border-primary")) {
          overviewTab.click();
          // Wait for the view to render
          return new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    },
    steps: [
      {
        element: "body",
        popover: {
          title: "Brand Dashboard",
          description: "Manage your brand presence and campaigns.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#create-post-btn",
        popover: {
          title: "Create Post",
          description: "Launch a new sponsored post or update.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#brand-profile-tab",
        popover: {
          title: "Profile",
          description: "Ensure your logo and banner are pixel-perfect here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#brand-stats",
        popover: {
          title: "Analytics",
          description: "See how your brand is performing across the platform.",
          side: "top",
          align: "start",
        },
      },
    ],
  });

  driverObj.drive();
}

