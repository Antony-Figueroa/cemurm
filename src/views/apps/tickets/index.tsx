import TicketsApp from "src/components/apps/tickets";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "src/components/shared/StyleAwareWrapper";
import StyleDivider from "src/components/shared/StyleDivider";
import DemoNotice from "src/components/shared/DemoNotice";

const BCrumb = [
  { to: "/admin", title: "Home" },
  { title: "Tickets" },
];

const Tickets = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Tickets App" items={BCrumb} />
      <StyleDivider />
      <DemoNotice>
        Demo screen — these tickets are template content. Changes live in
        memory only and are lost on reload; nothing is saved to CEMURM.
      </DemoNotice>
      <TicketsApp />
    </StyleAwareWrapper>
  );
};

export default Tickets;
