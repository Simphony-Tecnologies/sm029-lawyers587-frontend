export default function ReLoading({ desc }: { desc?: string }) {
  return (
    <>
      <div className='h-screen  flex justify-center items-center  z-50 bg-white flex-col '>
        {desc ? (
          <p className=' px-5 py-2 text-lg  leading-none text-center text-primary rounded-lg animate-pulse '>
            {desc}
          </p>
        ) : (
          <i className='fi fi-rr-rotate-right w-max h-max text-3xl text-main-color-500 animate-spin'></i>
        )}
      </div>
    </>
  );
}
