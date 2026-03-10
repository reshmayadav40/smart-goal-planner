const { addDays, format, differenceInDays } = require("date-fns");

/**
 * Distributes subtopics over a range of dates.
 * @param {Array} subtopics - List of subtopics to schedule.
 * @param {Date} startDate - Start date of the goal.
 * @param {Date} endDate - End date of the goal (inclusive).
 * @param {Number} dailyCapacity - Total minutes available per day.
 * @returns {Array} List of scheduled sessions.
 */
function distributeSubtopics(subtopics, startDate, endDate, dailyCapacity) {
  const schedule = [];
  const daysCount =
    differenceInDays(new Date(endDate), new Date(startDate)) + 1;

  const isMultiDay = daysCount > 1;
  let currentSubtopicIndex = 0;

  for (let i = 0; i < daysCount; i++) {
    const currentDate = addDays(new Date(startDate), i);
    let assignedForToday = false;

    // Sessions: Morning, Afternoon, Evening
    const capacities = {
      Morning: dailyCapacity * 0.3,
      Afternoon: dailyCapacity * 0.4,
      Evening: dailyCapacity * 0.3,
    };

    for (const session of ["Morning", "Afternoon", "Evening"]) {
      let sessionCapacity = capacities[session];

      while (currentSubtopicIndex < subtopics.length && sessionCapacity > 0) {
        const subtopic = subtopics[currentSubtopicIndex];
        const timeNeeded = subtopic.estimatedMinutes || 60;

        // Ensure we fit this into the current session
        schedule.push({
          subtopicId: subtopic._id,
          assignedDate: currentDate,
          session: session,
          plannedMinutes: timeNeeded,
        });
        currentSubtopicIndex++;
        
        sessionCapacity -= timeNeeded;
        // Even in multi-day, we want all 3 sessions to be populated if the AI provided them
      }
    }

    if (currentSubtopicIndex >= subtopics.length) break;
  }

  return schedule;
}

module.exports = {
  distributeSubtopics,
};
