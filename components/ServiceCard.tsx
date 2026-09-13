"use client";

type Props = {
  name: string;
  selected: boolean;
  onClick: () => void;
};

export default function ServiceCard({ name, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-xl cursor-pointer text-sm transition-all
        ${
          selected
            ? "border-purple-500 bg-purple-100 shadow-md"
            : "border-gray-300 hover:bg-gray-100 hover:shadow-sm"
        }`}
    >
      {name}
    </div>
  );
}
