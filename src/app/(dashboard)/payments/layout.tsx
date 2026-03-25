import { PaymentsTabBar } from "./payments-tab-bar";

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <PaymentsTabBar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
