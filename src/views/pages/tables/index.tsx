import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import BasicTable from 'src/components/tables/basic-table/BasicTable';
import CheckboxTable from 'src/components/tables/checkbox-table/CheckboxTable';
import HoverTable from 'src/components/tables/hover-table/HoverTable';
import StripedRowTable from 'src/components/tables/striped-row-table/StripedRowTable';
import DataTable from 'src/components/tables/data-table/DataTable';
import StyleDivider from 'src/components/shared/StyleDivider';
import StyleAwareWrapper from 'src/components/shared/StyleAwareWrapper';
import { useAdminTables } from '@/hooks/shared/useAdminTables';

const BCrumb = [
  { to: '/admin', title: 'Home' },
  { title: 'Tables' },
];

function TablesPage() {
  const { songs, setlists, dataTableRows } = useAdminTables();

  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-cem-hover"
    >
      <BreadcrumbComp title="Tables" items={BCrumb} />
      <StyleDivider />

      <StyleAwareWrapper
        lyraClassName="grid grid-cols-12 gap-px bg-cem-hover">
        <div className="col-span-12">
          <BasicTable rows={setlists} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <DataTable data={dataTableRows} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <HoverTable rows={songs} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <StripedRowTable rows={songs} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
        <div className="col-span-12">
          <CheckboxTable rows={songs} />
        </div>
        <div className="col-span-12">
          <StyleDivider />
        </div>
      </StyleAwareWrapper>

    </StyleAwareWrapper>
  );
}

export default TablesPage;
