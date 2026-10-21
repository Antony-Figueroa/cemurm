import NotesApp from "src/components/apps/notes";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "src/components/shared/StyleAwareWrapper";
import StyleDivider from "src/components/shared/StyleDivider";
import DemoNotice from "src/components/shared/DemoNotice";

const BCrumb = [
  { to: "/admin", title: "Home" },
  { title: "Notes" },
];

const Notes = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Notes app" items={BCrumb} />
      <StyleDivider />
      <DemoNotice>
        Demo screen — these notes are template content. Changes live in memory
        only and are lost on reload; nothing is saved to CEMURM.
      </DemoNotice>
      <NotesApp />
    </StyleAwareWrapper>
  );
};

export default Notes;
