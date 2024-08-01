import SearchInput from '../atoms/SearchInput';

type title = {
  name: string;
  search?: boolean;
  dataFilter?: any;
  setSearchText?: any;
  setSearchedResults?: any;
  children?: React.ReactNode;
};

const Tilte = ({
  name,
  search = false,
  dataFilter,
  setSearchText,
  setSearchedResults,
  children,
}: title) => {
  return (
    <div className=' font-semibold   flex gap-5 lg:flex-row flex-col justify-between '>
      <h1 className='text-primary text-3xl'>{name}</h1>
      {search && (
        <SearchInput
          dataFilter={dataFilter}
          setSearchText={setSearchText}
          setSearchedResults={setSearchedResults}
        />
      )}

      {children}
    </div>
  );
};

export default Tilte;
