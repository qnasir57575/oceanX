/** Narrow, centred layout for login / register / password pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-contours flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
