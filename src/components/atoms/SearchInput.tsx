type SearchInputProps = {
  dataFilter: LawyerData[];
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  setSearchedResults: React.Dispatch<React.SetStateAction<LawyerData[]>>;
};

const SearchInput: React.FC<SearchInputProps> = ({
  dataFilter,
  setSearchText,
  setSearchedResults,
}) => {
  const filterSearch = (text: string) =>
    dataFilter.filter(
      (item: any) =>
        item?.['lawyer name'].toLowerCase().includes(text.toLowerCase()) ||
        item?.email.toLowerCase().includes(text.toLowerCase()) ||
        item?.['phone number'].toLowerCase().includes(text.toLowerCase())
    );
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    const searchResult = filterSearch(e.target.value);
    setSearchedResults(searchResult);
  };

  return (
    <div className='  flex flex-col items-center justify-center  '>
      <input
        type='search'
        placeholder='Search...'
        onChange={handleSearchChange}
        className='peer w-full  rounded-md border border-gray-200 bg-white py-2.5 pl-5 pr-12 text-sm font-medium shadow-lg  focus:outline-none focus:ring-0'
      />
    </div>
  );
};

export default SearchInput;
