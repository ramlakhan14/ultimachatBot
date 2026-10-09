import * as React from "react";
import ReactPaginate from "react-paginate";
import styles from "./Paginator.module.scss";

interface PaginatorProps {
	onPageChange: (page: number) => void;
	pageRangeDisplayed: number;
	pageCount: number;
	forcePage?: number;
}


export const PaginatorTwo = ({
	onPageChange,
	pageRangeDisplayed,
	pageCount,
	forcePage
}: PaginatorProps) => {

	const handlePageChange = React.useCallback((selectedItem: { selected: number }) => {
		onPageChange(selectedItem.selected);
	}, [onPageChange]);



	return (

		<ReactPaginate
			className={styles.paginations}
			breakLabel="..."
			nextLabel={<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" clip-rule="evenodd" d="M3.48419 1.23371C3.51903 1.19878 3.56041 1.17108 3.60597 1.15217C3.65153 1.13327 3.70037 1.12354 3.74969 1.12354C3.79902 1.12354 3.84786 1.13327 3.89342 1.15217C3.93898 1.17108 3.98036 1.19878 4.01519 1.23371L8.51519 5.73371C8.55012 5.76854 8.57782 5.80992 8.59673 5.85548C8.61563 5.90104 8.62536 5.94988 8.62536 5.99921C8.62536 6.04853 8.61563 6.09737 8.59673 6.14293C8.57782 6.18849 8.55012 6.22987 8.51519 6.26471L4.01519 10.7647C3.94478 10.8351 3.84928 10.8747 3.74969 10.8747C3.65011 10.8747 3.55461 10.8351 3.48419 10.7647C3.41378 10.6943 3.37422 10.5988 3.37422 10.4992C3.37422 10.3996 3.41378 10.3041 3.48419 10.2337L7.71944 5.99921L3.48419 1.76471C3.44927 1.72987 3.42156 1.68849 3.40266 1.64293C3.38375 1.59737 3.37402 1.54853 3.37402 1.49921C3.37402 1.44988 3.38375 1.40104 3.40266 1.35548C3.42156 1.30992 3.44927 1.26854 3.48419 1.23371Z" fill="#524D4D" />
			</svg>
			}
			containerClassName={styles.container}
			previousClassName={styles.previous}
			nextClassName={styles.next}
			pageClassName={styles.page}
			activeClassName={styles.active}
			breakClassName={styles.break}
			onPageChange={handlePageChange}
			forcePage={forcePage}
			pageRangeDisplayed={pageRangeDisplayed}
			pageCount={pageCount}
			previousLabel={<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path fill-rule="evenodd" clip-rule="evenodd" d="M8.51519 1.23371C8.55012 1.26854 8.57782 1.30992 8.59673 1.35548C8.61563 1.40104 8.62536 1.44988 8.62536 1.49921C8.62536 1.54853 8.61563 1.59737 8.59673 1.64293C8.57782 1.68849 8.55012 1.72987 8.51519 1.76471L4.27994 5.99921L8.51519 10.2337C8.58561 10.3041 8.62517 10.3996 8.62517 10.4992C8.62517 10.5988 8.58561 10.6943 8.51519 10.7647C8.44478 10.8351 8.34928 10.8747 8.24969 10.8747C8.15011 10.8747 8.05461 10.8351 7.98419 10.7647L3.48419 6.26471C3.44927 6.22987 3.42156 6.18849 3.40266 6.14293C3.38375 6.09737 3.37402 6.04853 3.37402 5.99921C3.37402 5.94988 3.38375 5.90104 3.40266 5.85548C3.42156 5.80992 3.44927 5.76854 3.48419 5.73371L7.98419 1.23371C8.01903 1.19878 8.06041 1.17108 8.10597 1.15217C8.15153 1.13327 8.20037 1.12354 8.24969 1.12354C8.29902 1.12354 8.34786 1.13327 8.39342 1.15217C8.43898 1.17108 8.48036 1.19878 8.51519 1.23371Z" fill="#524D4D" />
			</svg>
			}
			renderOnZeroPageCount={null}
		/>
	);
};

interface PaginatorsProps {
	onPageChange: (page: number, id: number) => void;
	pageRangeDisplayed: number;
	pageCount: number;
	paginatorsId: number;
}

export const Paginators = ({
	onPageChange,
	pageRangeDisplayed,
	pageCount,
	paginatorsId
}: PaginatorsProps) => {

	const handlePageChanges = React.useCallback((selectedItem: { selected: number }) => {

		onPageChange(selectedItem.selected, paginatorsId);
	}, [onPageChange, paginatorsId]);


	return (

		<ReactPaginate
			className={styles.pagination}
			breakLabel="..."
			nextLabel="next"
			containerClassName={styles.container}
			previousClassName={styles.previous}
			nextClassName={styles.next}
			pageClassName={styles.page}
			activeClassName={styles.active}
			breakClassName={styles.break}
			onPageChange={handlePageChanges}
			pageRangeDisplayed={pageRangeDisplayed}
			pageCount={pageCount}
			previousLabel="previous"
			renderOnZeroPageCount={null}

		/>
	);
};