import { requireUser } from "@/lib/auth";
import { addContact } from "@/lib/actions";
import { listContacts } from "@/lib/core";
import { Avatar, Card, PageHeader } from "@/components/ui";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

export default async function ContactsPage() {
  const user = await requireUser();
  const contacts = listContacts(user.id);

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="People your agent is allowed to reach. Linked contacts route directly to their agent."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {contacts.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">No contacts yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {c.name}
                      {c.relationship && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {c.relationship}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {c.handle && `@${c.handle}`} {c.email && `· ${c.email}`}
                    </p>
                  </div>
                  {c.linked_user_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Agent linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                      Not on AgentBridge
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit p-6">
          <h2 className="text-sm font-semibold text-slate-900">Add contact</h2>
          <form action={addContact} className="mt-4 space-y-3">
            <input name="name" required placeholder="Name" className={inputCls} />
            <input name="email" type="email" placeholder="Email (optional)" className={inputCls} />
            <input name="handle" placeholder="Handle, e.g. @jordan (optional)" className={inputCls} />
            <input name="relationship" placeholder="Relationship (optional)" className={inputCls} />
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Add contact
            </button>
            <p className="text-xs leading-relaxed text-slate-400">
              If the handle or email matches a registered user, the contact is linked to their agent
              automatically.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
