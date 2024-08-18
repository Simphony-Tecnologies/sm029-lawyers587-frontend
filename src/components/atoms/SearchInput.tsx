type SearchInputProps = {
  filterSearch?: any;
};

const SearchInput: React.FC<SearchInputProps> = ({ filterSearch }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    filterSearch(e.target.value);
  };

  return (
    <div className=' bg-white px-5 py-2 xl:max-w-xl w-full flex gap-5  rounded-lg '>
      <input
        type='search'
        placeholder='Search...'
        onChange={handleSearchChange}
        className='w-full border-none bg-transparent outline-none focus:outline-none'
      />
      <i className='fi fi-rr-search text-gray-600 '></i>
    </div>
  );
};

export default SearchInput;
