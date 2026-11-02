import { Navigate, useLocation } from 'react-router-dom';

/** Legacy redirect that keeps query string and hash (Angular `redirectTo` parity). */
export function RedirectPreservingSearch({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: to, search, hash }} />;
}
