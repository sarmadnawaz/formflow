import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { embedToken, ensureCustomer, fastnConfigured, FastnError, iframeSrc } from "@/lib/fastn";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const { user, workspace } = await requireSession();

  let src: string | null = null;
  let problem: string | null = null;
  if (!fastnConfigured()) {
    problem = "Integrations are not configured on this server yet.";
  } else {
    try {
      await ensureCustomer(workspace, user);
      src = iframeSrc(await embedToken(workspace, user));
    } catch (e) {
      console.error("fastn embed failed", e instanceof FastnError ? { status: e.status, body: e.body } : e);
      problem = "We could not load your integrations. Please refresh in a moment.";
    }
  }

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect the apps your team uses and send every new response where it needs to go."
      />
      {src ? (
        <Card className="overflow-hidden">
          <iframe src={src} title="Formflow integrations" className="block h-[760px] w-full border-0" allow="clipboard-write" />
        </Card>
      ) : (
        <Card className="px-6 py-12 text-center text-sm text-slate-500">{problem}</Card>
      )}
    </>
  );
}
