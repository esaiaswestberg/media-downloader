package www

import (
	"fmt"
	"net/http"
	"strconv"
)

type RequestQuery map[string][]string

func ParseQuery(r *http.Request) RequestQuery {
	return RequestQuery(r.URL.Query())
}

func (q RequestQuery) Has(key string) bool {
	_, ok := q[key]
	return ok
}

func (q RequestQuery) Get(key string) (string, error) {
	values, ok := q[key]
	if !ok {
		return "", fmt.Errorf("key %q not found", key)
	}

	if len(values) == 0 {
		return "", fmt.Errorf("key %q has no value", key)
	}

	return values[0], nil
}

func (q RequestQuery) GetAll(key string) ([]string, error) {
	values, ok := q[key]
	if !ok {
		return nil, fmt.Errorf("key %q not found", key)
	}

	return values, nil
}

func (q RequestQuery) GetInt(key string) (int, error) {
	value, err := q.Get(key)
	if err != nil {
		return 0, err
	}

	return strconv.Atoi(value)
}

func (q RequestQuery) GetInt64(key string) (int64, error) {
	value, err := q.Get(key)
	if err != nil {
		return 0, err
	}

	return strconv.ParseInt(value, 10, 64)
}

func (q RequestQuery) GetFloat64(key string) (float64, error) {
	value, err := q.Get(key)
	if err != nil {
		return 0, err
	}

	floatValue, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, err
	}

	return floatValue, nil
}
