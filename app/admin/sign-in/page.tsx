import { redirect } from "next/navigation";
import AuthCard from "@/components/admin/AuthCard";
import SignInForm from "@/components/admin/SignInForm";
import LangToggle from "@/components/admin/LangToggle";
import { getSession } from "@/lib/admin/session";
import { getAdminLang, getAdminT } from "@/lib/admin/i18n";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getSession();
  if (session.state !== "signed-out") redirect("/admin");
  const [t, lang, { error }] = [await getAdminT(), await getAdminLang(), await searchParams];
  return (
    <AuthCard title={t("signIn.title")}>
      <SignInForm linkFailed={error === "link"} />
      <div className="flex justify-center pt-1">
        <LangToggle lang={lang} />
      </div>
    </AuthCard>
  );
}
