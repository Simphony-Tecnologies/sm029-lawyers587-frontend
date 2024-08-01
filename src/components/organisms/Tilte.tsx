import SearchInput from '../atoms/SearchInput';

type title = {
  name: string;
  search?: boolean;
  dataFilter?: any;
  setSearchText?: any;
  setSearchedResults?: any;
  children?: React.ReactNode;
  des?: string;
};

const Tilte = ({
  name,
  search = false,
  dataFilter,
  setSearchText,
  setSearchedResults,
  children,
  des,
}: title) => {
  return (
    <div className=' font-semibold   flex gap-5 lg:flex-row flex-col justify-between '>
      <div>
        <h1 className='text-primary text-3xl'>{name}</h1>
        {des && (
          <div className='text-primary capitalize font-normal'>{des}</div>
        )}
      </div>
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
