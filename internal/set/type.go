package set

type Set[T comparable] map[T]bool

func New[T comparable]() Set[T] {
	return make(Set[T])
}

func (s Set[T]) Add(v T) {
	s[v] = true
}

func (s Set[T]) AddAll(vs ...T) {
	for _, v := range vs {
		s.Add(v)
	}
}

func (s Set[T]) Contains(v T) bool {
	_, ok := s[v]
	return ok
}

func (s Set[T]) ContainsAll(vs ...T) bool {
	for _, v := range vs {
		if !s.Contains(v) {
			return false
		}
	}

	return true
}

func (s Set[T]) Len() int {
	return len(s)
}

func (s Set[T]) ToSlice() []T {
	var slice []T
	for v := range s {
		slice = append(slice, v)
	}
	return slice
}

func (s Set[T]) Remove(v T) {
	delete(s, v)
}

func (s Set[T]) RemoveAll(vs ...T) {
	for _, v := range vs {
		s.Remove(v)
	}
}
