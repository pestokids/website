import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// The daily digest goes out at 9am Los Angeles time. Convex crons run in UTC,
// and 9am there is 16:00 UTC in daylight time and 17:00 UTC in standard time,
// so the job runs at both and only the run that lands on 9am sends.
crons.cron("daily digest", "0 16,17 * * *", internal.digest.sendDaily, {});

export default crons;
