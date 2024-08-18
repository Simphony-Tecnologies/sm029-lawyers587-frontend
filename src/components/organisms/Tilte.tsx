import SearchInput from '../atoms/SearchInput';
import SkeletonText from '../atoms/SkeletonText';

type title = {
  name: string;
  search?: boolean;
  dataFilter?: any;
  setSearchText?: any;
  setSearchedResults?: any;
  children?: React.ReactNode;
  des?: string;
  filterSearch?: (text: string) => any;
};

const Tilte = ({
  name,
  search = false,
  children,
  des,
  filterSearch,
}: title) => {
  return (
    <>
      {name === 'undefined undefined' ? (
        <SkeletonText lines={2} />
      ) : (
        <div className=' font-semibold   flex gap-5 lg:flex-row flex-col justify-between '>
          <div>
            <h1 className='text-primary text-3xl'>{name}</h1>
            {des && (
              <div className='text-primary capitalize font-normal flex gap-2 flex-wrap'>
                {des}
              </div>
            )}
          </div>

          {search && (
            <div className='flex justify-end items-start gap-5 w-full max-w-xl'>
              <SearchInput filterSearch={filterSearch} />
            </div>
          )}

          {children}
        </div>
      )}
    </>
  );
};

export default Tilte;
