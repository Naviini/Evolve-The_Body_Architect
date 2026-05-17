/** Short lines for FIT-BOT — keep mobile-readable (one–two sentences max). */

export function pickFitBotMotivationLine(params: {
    calorieProgress: number;
    hasWorkoutToday: boolean;
}): string {
    const { calorieProgress, hasWorkoutToday } = params;

    if (calorieProgress >= 1) {
        return "Goal calories logged — huge win. Hydrate and recover like a pro.";
    }
    if (calorieProgress >= 0.85) {
        return "You're right at the finish line for today's fuel. Finish strong!";
    }
    if (hasWorkoutToday && calorieProgress >= 0.35) {
        return "Nice balance — training on deck and fuel looking steady. Keep flowing.";
    }
    if (hasWorkoutToday) {
        return "I've got your session lined up. One focused workout beats a perfect plan.";
    }
    if (calorieProgress <= 0.15) {
        return "Fresh slate today. Log a meal when you're ready — I'll be right here.";
    }
    if (calorieProgress >= 0.5) {
        return "Solid rhythm today. Keep proteins steady and enjoy the process.";
    }
    return "Small consistent moves beat giant sporadic ones. You've got this.";
}
