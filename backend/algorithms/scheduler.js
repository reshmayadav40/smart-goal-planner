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
      if (isMultiDay && assignedForToday) break; // Each day gets exactly one subtopic if multi-day

      let sessionCapacity = capacities[session];

      while (currentSubtopicIndex < subtopics.length && sessionCapacity > 0) {
        const subtopic = subtopics[currentSubtopicIndex];
        const timeNeeded = subtopic.estimatedMinutes || 60;

        // If it fits in this session (roughly)
        const buffer = isMultiDay ? 30 : 60; // More flexibility for 1-day goals to fill time
        if (timeNeeded <= sessionCapacity + buffer) {
          schedule.push({
            subtopicId: subtopic._id,
            assignedDate: currentDate,
            session: session,
            plannedMinutes: timeNeeded,
          });
          currentSubtopicIndex++;
          assignedForToday = true;

          if (isMultiDay) break; // Move to next day

          sessionCapacity -= timeNeeded;
        } else {
          // Doesn't fit in this session, move to next session
          break;
        }
      }
    }

    if (currentSubtopicIndex >= subtopics.length) break;
  }

  return schedule;
}

module.exports = {
  distributeSubtopics,
};
