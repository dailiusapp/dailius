export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center sm:px-8 lg:px-12">
      <h1 className="text-xl font-semibold text-navy">{title}</h1>
      <p className="mt-3 text-[15px] leading-6 text-gray-600">
        This part of Dailius is coming soon.
      </p>
    </div>
  );
}
