import Link from "next/link";
import AuthCard from "./AuthCard";
import { getAdminT } from "@/lib/admin/i18n";
import { signOut } from "@/app/admin/actions";

// Signed in, but not an active staff member.
export default async function NoAccess({ email }: { email: string }) {
  const t = await getAdminT();
  return (
    <AuthCard title={t("noAccess.title")}>
      <p className="m-0 text-[14px] text-muted">
        {t.rich("noAccess.text", { email: () => <bdi dir="ltr" className="font-medium text-emerald">{email}</bdi> })}
      </p>
      <form action={signOut}>
        <button type="submit" className="th-btn th-btn-pink w-full justify-center">
          {t("nav.signOut")}
        </button>
      </form>
      <Link href="/" className="text-[14px] text-emerald underline underline-offset-2">
        {t("signIn.toSite")}
      </Link>
    </AuthCard>
  );
}
