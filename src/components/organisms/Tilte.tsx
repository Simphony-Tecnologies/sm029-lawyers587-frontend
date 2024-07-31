import SearchInput from '../atoms/SearchInput';

type title = {
  name: string;
  search?: boolean;
  dataFilter?: any;
  setSearchText?: any;
  setSearchedResults?: any;
};

const Tilte = ({
  name,
  search = false,
  dataFilter,
  setSearchText,
  setSearchedResults,
}: title) => {
  return (
    <div className='text-3xl font-semibold   flex gap-5 lg:flex-row flex-col justify-between '>
      <h1 className='text-primary'>{name}</h1>
      {search && (
        <SearchInput
          dataFilter={dataFilter}
          setSearchText={setSearchText}
          setSearchedResults={setSearchedResults}
        />
      )}
    </div>
  );
};

export default Tilte;
