import BlogDetailData from "@/components/apps/blog/detail";
import { BlogProvider } from "src/context/blog-context";
import BreadcrumbComp from "src/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "src/components/shared/StyleAwareWrapper";
import StyleDivider from "src/components/shared/StyleDivider";
import DemoNotice from "src/components/shared/DemoNotice";

const BCrumb = [
  { to: "/admin", title: "Home" },
  { title: "Blog Detail" },
];

const BlogDetail = () => {
  return (
    <BlogProvider>
      <StyleAwareWrapper
        lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
        defaultClassName="flex flex-col gap-4"
      >
        <BreadcrumbComp title="Blog Detail" items={BCrumb} />
        <StyleDivider />
        <DemoNotice>
          Demo screen — template blog content. This view is not connected to
          CEMURM data and nothing you change here is saved.
        </DemoNotice>
        <BlogDetailData />
      </StyleAwareWrapper>
    </BlogProvider>
  );
};

export default BlogDetail;
