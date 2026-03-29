/**
 * SmartMatch — Client-side scoring engine (#14)
 * Compares a talent profile against project requirements
 * and returns a 0–100 match percentage.
 */

interface ProjectRequirements {
  role?: string;
  location?: string;
  gender?: string;
  min_age?: number;
  max_age?: number;
  min_experience?: number;
  height_range?: string;
  skills?: string[];
  category?: string;
}

interface TalentProfile {
  role?: string;
  location?: string;
  gender?: string;
  age?: number;
  experience_years?: number;
  height?: string;
  bio?: string;
  style_tags?: string[];
  mood_tags?: string[];
}

interface MatchResult {
  score: number; // 0-100
  tier: "perfect" | "great" | "good" | "partial" | "low";
  breakdown: { field: string; matched: boolean; weight: number }[];
}

const WEIGHTS = {
  role: 30,
  location: 15,
  gender: 10,
  age: 15,
  experience: 15,
  skills: 15,
};

export function calculateSmartMatch(talent: TalentProfile, requirements: ProjectRequirements): MatchResult {
  const breakdown: MatchResult["breakdown"] = [];
  let totalWeight = 0;
  let totalScore = 0;

  // 1. Role match
  if (requirements.role) {
    totalWeight += WEIGHTS.role;
    const matches = talent.role?.toLowerCase() === requirements.role.toLowerCase() ||
                    requirements.role.toLowerCase() === "any";
    breakdown.push({ field: "Role", matched: matches, weight: WEIGHTS.role });
    if (matches) totalScore += WEIGHTS.role;
  }

  // 2. Location match
  if (requirements.location) {
    totalWeight += WEIGHTS.location;
    const matches = !talent.location ? false :
      talent.location.toLowerCase().includes(requirements.location.toLowerCase()) ||
      requirements.location.toLowerCase().includes(talent.location.toLowerCase());
    breakdown.push({ field: "Location", matched: matches, weight: WEIGHTS.location });
    if (matches) totalScore += WEIGHTS.location;
  }

  // 3. Gender match
  if (requirements.gender && requirements.gender !== "any") {
    totalWeight += WEIGHTS.gender;
    const matches = talent.gender?.toLowerCase() === requirements.gender.toLowerCase();
    breakdown.push({ field: "Gender", matched: !!matches, weight: WEIGHTS.gender });
    if (matches) totalScore += WEIGHTS.gender;
  }

  // 4. Age range
  if (requirements.min_age || requirements.max_age) {
    totalWeight += WEIGHTS.age;
    const age = talent.age || 0;
    const inRange = 
      (requirements.min_age ? age >= requirements.min_age : true) &&
      (requirements.max_age ? age <= requirements.max_age : true);
    breakdown.push({ field: "Age", matched: inRange, weight: WEIGHTS.age });
    if (inRange) totalScore += WEIGHTS.age;
  }

  // 5. Experience
  if (requirements.min_experience) {
    totalWeight += WEIGHTS.experience;
    const meets = (talent.experience_years || 0) >= requirements.min_experience;
    breakdown.push({ field: "Experience", matched: meets, weight: WEIGHTS.experience });
    if (meets) totalScore += WEIGHTS.experience;
  }

  // 6. Skills/tags overlap
  if (requirements.skills && requirements.skills.length > 0) {
    totalWeight += WEIGHTS.skills;
    const talentTags = [
      ...(talent.style_tags || []),
      ...(talent.mood_tags || []),
    ].map(t => t.toLowerCase());
    const matched = requirements.skills.filter(s => talentTags.includes(s.toLowerCase()));
    const ratio = matched.length / requirements.skills.length;
    const partialScore = Math.round(ratio * WEIGHTS.skills);
    breakdown.push({ field: "Skills", matched: ratio >= 0.5, weight: WEIGHTS.skills });
    totalScore += partialScore;
  }

  // Calculate final score
  const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 50;
  
  // Determine tier
  let tier: MatchResult["tier"];
  if (score >= 90) tier = "perfect";
  else if (score >= 75) tier = "great";
  else if (score >= 60) tier = "good";
  else if (score >= 40) tier = "partial";
  else tier = "low";

  return { score, tier, breakdown };
}

/** Badge color/glow mapping */
export function getMatchBadgeStyle(tier: MatchResult["tier"]) {
  switch (tier) {
    case "perfect":
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10";
    case "great":
      return "bg-primary/15 border-primary/30 text-primary shadow-primary/10";
    case "good":
      return "bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/10";
    case "partial":
      return "bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-orange-500/10";
    case "low":
      return "bg-foreground/5 border-border text-muted-foreground shadow-none";
  }
}
