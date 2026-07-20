import { useParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { useStudentProfile } from "@/features/admin/studentProfile/useStudentProfile";
import { StudentProfileHeader } from "@/features/admin/studentProfile/StudentProfileHeader";
import { StudentProgressPanel } from "@/features/admin/studentProfile/StudentProgressPanel";
import { StudentDeliverableTimeline } from "@/features/admin/studentProfile/StudentDeliverableTimeline";
import { StudentTutorTranscripts } from "@/features/admin/studentProfile/StudentTutorTranscripts";
import { StudentCommunicationLog } from "@/features/admin/studentProfile/StudentCommunicationLog";
import { StudentInternalNotes } from "@/features/admin/studentProfile/StudentInternalNotes";
import { StudentMessageComposer } from "@/features/admin/studentProfile/StudentMessageComposer";

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-3">
    <h2 className="font-display text-2xl uppercase text-perestroika-preto leading-none">{title}</h2>
    {sub && <p className="text-xs text-perestroika-preto/55 mt-1">{sub}</p>}
  </div>
);

const AdminStudentProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading } = useStudentProfile(userId);

  if (!userId) return null;

  return (
    <PageShell>
      <PageHeader back={{ to: "/admin", label: "voltar" }} actions={<AuthedHeaderActions />} />
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-24 pt-6 space-y-10">
        {isLoading || !profile ? (
          <p className="text-sm text-perestroika-preto/55">carregando perfil…</p>
        ) : (
          <>
            <StudentProfileHeader userId={userId} profile={profile} />

            <section>
              <SectionHeader title="progresso" sub="ritmo por curso, módulo atual e último sinal de vida" />
              <StudentProgressPanel userId={userId} />
            </section>

            <section>
              <SectionHeader title="entregas & feedback" sub="histórico completo, expande para ler conversa" />
              <StudentDeliverableTimeline userId={userId} />
            </section>

            <section>
              <SectionHeader title="conversas com o tutor" sub="o que o estudante perguntou na trilha" />
              <StudentTutorTranscripts userId={userId} />
            </section>

            <section>
              <SectionHeader title="comunicação automática" sub="nudges e notificações dos últimos 90 dias" />
              <StudentCommunicationLog userId={userId} />
            </section>

            <section>
              <SectionHeader title="mensagem direta" sub="manda um recado in-app (opcionalmente por e-mail também)" />
              <StudentMessageComposer userId={userId} />
            </section>

            <section>
              <SectionHeader title="notas internas" sub="anotações privadas, só admins veem" />
              <StudentInternalNotes userId={userId} />
            </section>
          </>
        )}
      </main>
    </PageShell>
  );
};

export default AdminStudentProfile;
