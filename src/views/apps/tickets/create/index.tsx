import CreateTicketForm from "src/components/apps/tickets/create-ticketform";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "src/components/shared/StyleAwareWrapper";
import StyleDivider from "src/components/shared/StyleDivider";
import DemoNotice from "src/components/shared/DemoNotice";

const BCrumb = [
  { to: "/admin", title: "Home" },
  { title: "Tickets" },
];

const CreateTickets = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Tickets App" items={BCrumb} />
      <StyleDivider />
      <DemoNotice>
        Demo screen — creating a ticket adds it to the in-memory demo list.
        Nothing is saved to CEMURM and the list resets on reload.
      </DemoNotice>
      <CreateTicketForm />
    </StyleAwareWrapper>
  );
};

export default CreateTickets;
