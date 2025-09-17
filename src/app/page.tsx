
import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect to the login page from the root.
  // The login page itself will handle redirection if the user is already authenticated.
  redirect('/login');
}
