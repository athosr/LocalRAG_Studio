from rag_service.domain.citations import (
    filter_valid_ref_indices,
    parse_cited_ref_indices,
)


def test_single_refs():
    assert parse_cited_ref_indices("See [#1].") == [1]
    assert parse_cited_ref_indices("A [#2] b [#3] c") == [2, 3]


def test_comma_list_in_bracket():
    assert parse_cited_ref_indices("DP-5 [#2, #5].") == [2, 5]
    assert parse_cited_ref_indices("x [#2,#5] y") == [2, 5]
    assert parse_cited_ref_indices("INC-2024-031 [#1].") == [1]


def test_dedupe_left_to_right():
    assert parse_cited_ref_indices("[#3][#2][#3]") == [3, 2]


def test_double_digit_single():
    assert parse_cited_ref_indices("only [#12]") == [12]


def test_filter_valid_ref_indices_drops_out_of_range_and_dedupes():
    assert filter_valid_ref_indices([3, 0, 7, 3, 1], max_ref=3) == [3, 1]


def test_filter_valid_ref_indices_empty_when_no_refs_available():
    assert filter_valid_ref_indices([1, 2, 3], max_ref=0) == []
