import { redirect } from "next/navigation";

/* The login screen moved to /login - keep old links working. */
export default function SignInRedirect() {
  redirect("/login");
}
