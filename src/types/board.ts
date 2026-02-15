export interface Card {
  id: string;
  title: string;
  description: string;
  labels: string[];
  startDate: string;
  dueDate: string;
  completed: boolean;
  completedAt: string;
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  cardIds: string[];
}

export interface BoardData {
  id: string;
  name: string;
  lists: List[];
  cards: Record<string, Card>;
  labelNames: Record<string, string>;
}

export const LABEL_COLORS: Record<string, string> = {
  green: "#61bd4f",
  yellow: "#f2d600",
  orange: "#ff9f1a",
  red: "#eb5a46",
  purple: "#c377e0",
  blue: "#0079bf",
};
