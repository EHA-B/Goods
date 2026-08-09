import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function DataTableBody({
  children,
}: Props) {
  return <tbody>{children}</tbody>;
}