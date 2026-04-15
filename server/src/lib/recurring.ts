import { db } from "../db/index.js";
import { recurringTemplates, todos, todoTags } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { CronExpressionParser } from "cron-parser";

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function generateRecurringTodos() {
  const today = todayDateStr();
  const templates = db
    .select()
    .from(recurringTemplates)
    .where(eq(recurringTemplates.enabled, 1))
    .all();

  let generated = 0;

  for (const template of templates) {
    if (template.lastGenerated === today) continue;

    try {
      const cron = CronExpressionParser.parse(template.schedule, {
        currentDate: new Date(today + "T00:00:00"),
      });
      const prev = cron.prev();
      const prevDate = prev.toDate().toISOString().split("T")[0];

      if (prevDate === today) {
        const todo = db
          .insert(todos)
          .values({
            spaceId: template.spaceId,
            title: template.title,
            description: template.description || null,
            priority: template.priority as "highest" | "high" | "medium" | "low" | "lowest",
            dueDate: today,
          })
          .returning()
          .get();

        const tagIds: number[] = JSON.parse(template.tagIds || "[]");
        for (const tagId of tagIds) {
          try {
            db.insert(todoTags).values({ todoId: todo.id, tagId }).run();
          } catch {
            // Tag might have been deleted
          }
        }

        db.update(recurringTemplates)
          .set({ lastGenerated: today })
          .where(eq(recurringTemplates.id, template.id))
          .run();

        generated++;
        console.log(`[devtodo] generated recurring: "${template.title}"`);
      }
    } catch (err) {
      console.error(`[devtodo] invalid cron for template ${template.id}:`, err);
    }
  }

  if (generated > 0) {
    console.log(`[devtodo] generated ${generated} recurring todo(s)`);
  }
}
