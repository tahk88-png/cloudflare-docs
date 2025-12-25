import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage({
	searchParams,
}: {
	searchParams?: { from?: string };
}) {
	return <AdminLoginForm from={searchParams?.from ?? "/admin"} />;
}

