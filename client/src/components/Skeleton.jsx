// reusable skeleton block (pass className to control size)
// animate pulse -> fade in and out
function Skeleton({className = ""}){
    return (
        <div className = {`animate-pulse bg-gray-200 rounded-lg ${className}`} />
    );
}

export default Skeleton;