import IconifyIcon from "src/components/icons/iconify-icons";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "src/components/shared/StyleAwareWrapper";
import StyleDivider from "src/components/shared/StyleDivider";
import DemoNotice from "src/components/shared/DemoNotice";

const BCrumb = [
  { to: "/admin", title: "Home" },
  { title: "Iconify Icons" },
];

const page = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Iconify Icons" items={BCrumb} />
      <StyleDivider />
      <DemoNotice>
        Template reference — this icon gallery is static documentation and does
        not affect CEMURM.
      </DemoNotice>
      <IconifyIcon />
    </StyleAwareWrapper>
  );
};

export default page;
