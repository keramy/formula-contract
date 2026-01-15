import { FormulaLoader } from "@/components/ui/formula-loader";

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FormulaLoader />
    </div>
  );
}
