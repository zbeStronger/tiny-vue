export function shouldUpdateComponent(prevNode, nextVNode) {
  const { props: prevProps } = prevNode;
  const { props: nextProps } = nextVNode;
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }
  return false;
}
