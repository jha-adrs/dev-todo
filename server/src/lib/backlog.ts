import { db } from "../db/index.js";
import { todos, tags, todoTags } from "../db/schema.js";
import { eq, lt, ne, and, asc, desc, sql, gt } from "drizzle-orm";

export interface TagInfo {
  id: number;
  name: string;
  color: string;
}

export interface TodoWithMeta {
  id: number;
  spaceId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  pinned: number;
  sortOrder: number;
  snoozedUntil: string | null;
  createdAt: string;
  completedAt: string | null;
  dueDate: string;
  overdueDays?: number;
  tags: TagInfo[];
}

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

function attachTags(todoList: any[]): TodoWithMeta[] {
  return todoList.map((todo) => {
    const todoTagRows = db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(todoTags)
      .innerJoin(tags, eq(todoTags.tagId, tags.id))
      .where(eq(todoTags.todoId, todo.id))
      .all();
    return { ...todo, tags: todoTagRows };
  });
}

export function getTodosForDate(spaceId: number, date?: string) {
  const targetDate = date || todayDateStr();

  const todayTodos = db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.spaceId, spaceId),
        eq(todos.dueDate, targetDate),
        sql`(${todos.snoozedUntil} IS NULL OR ${todos.snoozedUntil} <= ${targetDate})`,
      ),
    )
    .orderBy(
      desc(todos.pinned),
      sql`CASE WHEN ${todos.status} = 'completed' THEN 1 ELSE 0 END`,
      asc(todos.sortOrder),
      desc(todos.createdAt),
    )
    .all();

  const backlogTodos = db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.spaceId, spaceId),
        lt(todos.dueDate, targetDate),
        ne(todos.status, "completed"),
        sql`(${todos.snoozedUntil} IS NULL OR ${todos.snoozedUntil} <= ${targetDate})`,
      ),
    )
    .orderBy(asc(todos.dueDate))
    .all();

  const snoozedRows = db
    .select({ count: sql<number>`count(*)` })
    .from(todos)
    .where(and(eq(todos.spaceId, spaceId), gt(todos.snoozedUntil, targetDate)))
    .get();

  const target = new Date(targetDate);
  const backlogWithMeta = backlogTodos.map((todo) => {
    const due = new Date(todo.dueDate);
    const diffMs = target.getTime() - due.getTime();
    const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return { ...todo, overdueDays };
  });

  return {
    today: attachTags(todayTodos),
    backlog: attachTags(backlogWithMeta),
    snoozedCount: snoozedRows?.count || 0,
  };
}

export { todayDateStr };
