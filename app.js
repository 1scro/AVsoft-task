$(function () {
  let overlayTimeoutId;

  let dataSource = new DevExpress.data.DataSource({
    load: function (loadOptions) {
      let d = $.Deferred();
      $.ajax({
        url: "https://jupiter.avsw.ru/testcases/data",
        dataType: "json",
        data: loadOptions,
        success: function (result) {
          d.resolve(result);
        },
        error: function (xhr) {
          d.reject(xhr.statusText);
        },
      });
      return d.promise();
    },

    onChanged: function () {
      let overlay = $(".overlay");
      overlayTimeoutId = setTimeout(function () {
        overlay.show();
      }, 1000); // Показать модальное окно при загрузке данных > 1 сек.
    },
  });

  //Обработка клика на кнопку "Load Data"
  $(".btn-request").click(function () {
    dataSource.requireTotalCount(true);
    loadData();
    $(this).remove();

    renderInput();
    renderPageSize();
  });

  function loadData() {
    $(".error-message").remove();
    dataSource
      .load()
      .done(function (data) {
        renderTable(data);
        renderPagination();
      })
      .fail(function (error) {
        renderErrorMessage();
      })
      .always(function () {
        clearTimeout(overlayTimeoutId); // Не отображать мод. окно при загрузке меньше 1 сек.
        $(".overlay").hide();
      });
  }

  function renderInput() {
    let input = $("<input>")
      .prependTo($(".table-wrapper"))
      .addClass("search-input")
      .attr("placeholder", "Search...");

    input.on("input", function () {
      let value = $(this).val().toLowerCase();
      let options = "[";
      let keys = $(".table th")
        .map(function () {
          return $(this).text();
        })
        .get();
      $.each(keys, function (index, key) {
        options += `['${key}', 'contains', '${value}']`;
        if (index != keys.length - 1) {
          options += `,'or',`;
        } else {
          options += "]";
        }
      });
      dataSource.filter(options);
      loadData();
    });
  }

  function renderErrorMessage() {
    let message = $("<p></p>", {
      class: "error-message",
      text: "Ошибка загрузки данных...",
    });
    $(".search-input").after(message);
  }

  function renderTable(data) {
    //Количество полученных записей
    let totalCount = dataSource.totalCount();

    //Если данные не получены
    if (totalCount == 0) {
      $(".table-row:gt(0)").remove();
      let row = $("<tr>").addClass("table-row");
      $(".table-header").each(function (index, key) {
        $("<td>").text("-").appendTo(row).addClass("table-cell");
      });
      row.appendTo($(".table-wrapper table"));
      return;
    }

    //Массив заголовков таблицы
    let keys = Object.keys(data[0]);

    //Если таблица ранее не создана, то создать
    if ($(".table-wrapper table").length == 0) {
      let table = $("<table>").addClass("table");
      let wrapper = $("<div></div>").addClass("table-inner");
      wrapper.append(table);

      $(".search-input").after(wrapper);
      let headerRow = $("<tr>").appendTo(table);
      headerRow.addClass("table-row");

      //Создание и добавление заголовков таблицы
      $.each(keys, function (index, key) {
        let header = $("<th>");
        header.text(key).appendTo(headerRow).addClass("table-header");
        header.on("click", handlerSortElem);
      });
      createModalLoader();
    }

    $(".table-row:gt(0)").remove();
    //Создание и добавление записей в таблице
    $.each(data, function (index, item) {
      let row = $("<tr>").appendTo($(".table-wrapper table"));
      row.addClass("table-row");
      $.each(keys, function (index, key) {
        $("<td>").text(item[key]).appendTo(row).addClass("table-cell");
      });
    });

    //Обработка клика по строкам таблицы для отображения инфо-карточки
    $(".table").on("click", ".table-row:not(:eq(0))", function () {
      renderInfoCard($(this));
    });
  }

  function renderPageSize() {
    $("<div></div>").appendTo(".table-wrapper").addClass("btn-wrapper");
    let select = $("<select></select>").addClass("select-size");
    select.append(
      $("<option>", {
        value: 1,
        text: "1",
      })
    );
    select.append(
      $("<option>", {
        value: 5,
        text: "5",
      })
    );
    select.append(
      $("<option>", {
        value: 10,
        text: "10",
      })
    );
    select.val("10").prop("selected", true);
    select.appendTo(".btn-wrapper");
    $("option").addClass("selected-size");

    select.on("change", function () {
      var selectedOption = $(this).children("option:selected").val();
      pageSize = parseInt(selectedOption);
      dataSource.pageSize(pageSize);
      dataSource.pageIndex(0);
      loadData();
    });
  }

  function renderInfoCard(data) {
    $(".card").remove();
    let row = data;
    let card = $("<div></div>", { class: "card" });
    let keys = $(".table-header")
      .map(function () {
        return $(this).text();
      })
      .get();
    let cells = row.find(".table-cell");
    cells.each(function (index) {
      let td = $(this);
      let text = td.text();
      let header = $("<span></span>", { text: keys[index] + ": " });
      let info = $("<p>", { class: "card-info", text: text });
      info.prepend(header);
      card.append(info);
      card.appendTo(".container");
    });
  }

  function createModalLoader() {
    let overlay = $("<div>", { class: "overlay" });
    let loader = $("<div>", { class: "loader", text: "Loading..." });
    overlay.append(loader);
    $(".table").prepend(overlay);
  }

  let currentSortColumn;
  let sortDirection;

  function handlerSortElem() {
    let elem = $(this);
    let indexElem = elem.index();
    let sortValue = elem.text();
    $(".arrow-desc").removeClass("arrow-desc");
    $(".arrow-asc").removeClass("arrow-asc");

    if (currentSortColumn != indexElem) {
      currentSortColumn = indexElem;
      sortDirection = false;
    } else {
      sortDirection = !sortDirection;
    }

    //Отображение типа сортировки в столбце
    if (sortDirection) {
      elem.addClass("arrow-desc");
    } else {
      elem.addClass("arrow-asc");
    }

    dataSource.sort(`[{ selector: "${sortValue}", desc: ${sortDirection} }]`);
    loadData();
  }

  function renderPagination() {
    let pageSize = dataSource.pageSize();
    let totalPageCount = Math.ceil(dataSource.totalCount() / pageSize);
    let currentPage = dataSource.pageIndex() + 1;
    let siblingCount = 1; //Количество соседних кнопок у центральной кнопки пагинации
    let totalPageNumbers = siblingCount + 5; //Макс количество кнопок пагинации
    let pages = []; //Массив кнопок пагинации

    //Если возможно отобразить все кнопки пагинации без троеточия
    if (totalPageNumbers >= totalPageCount) {
      for (let i = 1; i <= totalPageCount; i++) {
        pages.push(i);
      }
    }

    //Вычисление значений у центральных кнопок пагинации
    let leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    let rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount
    );

    let shouldShowLeftDots = leftSiblingIndex > 2;
    let shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    let firstPageIndex = 1;
    let lastPageIndex = totalPageCount;

    //Если нужно отобразить троеточие справа
    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = [];
      for (let i = 1; i <= leftItemCount; i++) {
        leftRange.push(i);
      }
      pages = [...leftRange, "...", totalPageCount];
    }

    //Если нужно отобразить троеточие слева
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;

      let rightRange = [];
      let value = totalPageCount - rightItemCount + 1;
      for (let i = value; i <= totalPageCount; i++) {
        rightRange.push(i);
      }
      pages = [firstPageIndex, "...", ...rightRange];
    }

    //Если нужно отобразить троеточие слева и справа
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = [];
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        middleRange.push(i);
      }
      pages = [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }

    if ($(".btn-page-wrapper").length == 0) {
      $("<div></div>").appendTo(".btn-wrapper").addClass("btn-page-wrapper");
    }

    $(".btn-page").remove();

    //Не отображать пагинацию при одной странице данных
    if (pages.length == 1) {
      $(".btn-page-wrapper").remove();
      return;
    }

    //Отобразить кнопки пагинации
    $.each(pages, function (index, value) {
      let btn = $("<button>");
      btn.text(value).appendTo(".btn-page-wrapper").addClass("btn-page");
      if (value == currentPage) {
        btn.addClass("active");
      }
    });

    //Обработка клика по кнопкам пагинации
    $(".btn-page").on("click", function () {
      pageNumber = parseInt($(this).text());
      if (pageNumber) {
        dataSource.pageIndex(pageNumber - 1);
        loadData();
      }
    });
  }
});
